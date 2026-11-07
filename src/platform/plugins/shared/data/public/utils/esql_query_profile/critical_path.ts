/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryProfileView, TimelineDriver } from './aggregate_esql_profile';

/**
 * Clocks have millisecond resolution, so a driver that finished "at" the moment another one woke
 * up can be a millisecond or two off.
 */
const CLOCK_TOLERANCE_MILLIS = 2;
/** A straggler is only worth naming when it is a clear distance behind its peers. */
const MIN_STRAGGLER_PEERS = 3;
const MIN_STRAGGLER_LAG_MILLIS = 5;
const MIN_STRAGGLER_SHARE = 0.2;

export interface CriticalLink {
  /** The driver whose finishing let the other one carry on. */
  fromId: string;
  /** The driver that was waiting for it. */
  toId: string;
  /** When the waiting driver woke up. */
  atMillis: number;
}

export interface CriticalPath {
  /** The drivers that decided when the query finished, from the last to finish back to the first. */
  driverIds: string[];
  links: CriticalLink[];
}

export interface Straggler {
  driverId: string;
  /** How long after the typical driver of its kind this one finished. */
  lagMillis: number;
  /** When the typical driver of its kind finished, from the start of the first driver. */
  typicalFinishMillis: number;
  /** When this driver started, from the start of the first driver. */
  startMillis: number;
  /**
   * True when it started about when its peers finished, which says it was waiting for a free
   * thread and not slow at its work.
   */
  startedLate: boolean;
}

/** A driver wakes up for a reason, and only waiting for data says another driver is the cause. */
const isWaitingForData = (reason: string): boolean => reason.includes('empty');

const lastWait = (driver: TimelineDriver) =>
  driver.sleeps.reduce<TimelineDriver['sleeps'][number] | undefined>(
    (latest, sleep) => (!latest || sleep.stopMillis > latest.stopMillis ? sleep : latest),
    undefined
  );

/**
 * Follows what the query waited for. The driver that finished last was waiting for data until it
 * woke up, and the driver that finished just then is what it waited for, and so on. Everything
 * else ran at the same time but did not decide when the query finished. ES does not say which
 * exchange woke which driver, so this is read from the times, and it is a best guess when several
 * drivers finish within the same millisecond.
 */
export function findCriticalPath(view: QueryProfileView): CriticalPath | undefined {
  const drivers = view.timeline.drivers;
  if (drivers.length < 2) {
    return undefined;
  }

  const last = drivers.reduce((latest, driver) =>
    driver.stopMillis >= latest.stopMillis ? driver : latest
  );
  const driverIds = [last.id];
  const links: CriticalLink[] = [];
  let waiting = last;

  for (;;) {
    const wait = lastWait(waiting);
    if (!wait || !isWaitingForData(wait.reason)) {
      break;
    }

    const causes = drivers.filter(
      (driver) =>
        !driverIds.includes(driver.id) &&
        driver.startMillis <= wait.stopMillis &&
        Math.abs(driver.stopMillis - wait.stopMillis) <= CLOCK_TOLERANCE_MILLIS
    );
    // A driver is woken by the stage right before it, so a later stage is preferred to a data
    // driver that finished at the same time. Then the one that finished closest to the wake up, and
    // the longest running if they tie.
    const cause = causes.reduce<TimelineDriver | undefined>((best, driver) => {
      if (!best) {
        return driver;
      }
      const stage = Number(driver.description !== 'data');
      const bestStage = Number(best.description !== 'data');
      if (stage !== bestStage) {
        return stage > bestStage ? driver : best;
      }
      const distance = Math.abs(driver.stopMillis - wait.stopMillis);
      const bestDistance = Math.abs(best.stopMillis - wait.stopMillis);
      if (distance !== bestDistance) {
        return distance < bestDistance ? driver : best;
      }
      return driver.stopMillis - driver.startMillis > best.stopMillis - best.startMillis
        ? driver
        : best;
    }, undefined);
    if (!cause) {
      break;
    }

    links.push({ fromId: cause.id, toId: waiting.id, atMillis: wait.stopMillis });
    driverIds.push(cause.id);
    waiting = cause;
  }

  return driverIds.length > 1 ? { driverIds, links } : undefined;
}

/**
 * The data drivers of a stage are listed right before the driver that combines their results, so
 * data drivers are peers when the same driver follows them. Other drivers have no peers.
 */
const peerGroup = (driver: TimelineDriver, drivers: TimelineDriver[]): string => {
  if (driver.description !== 'data') {
    return `driver-${driver.id}`;
  }
  const next = drivers.find(
    (candidate) => Number(candidate.id) > Number(driver.id) && candidate.description !== 'data'
  );
  return next ? `before-${next.id}` : 'last';
};

/**
 * A driver on the critical path that finished well after the others of its kind, so the query
 * waited for it while they sat done. Returns nothing when the path starts at a driver that is
 * alone, or the lag is small.
 */
export function findStraggler(view: QueryProfileView, path: CriticalPath): Straggler | undefined {
  const drivers = view.timeline.drivers;
  const origin = drivers.find((driver) => driver.id === path.driverIds[path.driverIds.length - 1]);
  if (!origin) {
    return undefined;
  }

  const group = peerGroup(origin, drivers);
  const peers = drivers.filter(
    (driver) => driver.description === origin.description && peerGroup(driver, drivers) === group
  );
  if (peers.length < MIN_STRAGGLER_PEERS) {
    return undefined;
  }

  const stops = peers.map((driver) => driver.stopMillis).sort((left, right) => left - right);
  const typicalStop = stops[Math.floor(stops.length / 2)];
  const lagMillis = origin.stopMillis - typicalStop;
  const start = Math.min(...drivers.map((driver) => driver.startMillis));
  const total = Math.max(...drivers.map((driver) => driver.stopMillis)) - start;

  return lagMillis >= MIN_STRAGGLER_LAG_MILLIS && lagMillis >= total * MIN_STRAGGLER_SHARE
    ? {
        driverId: origin.id,
        lagMillis,
        typicalFinishMillis: typicalStop - start,
        startMillis: origin.startMillis - start,
        startedLate: origin.startMillis >= typicalStop - CLOCK_TOLERANCE_MILLIS,
      }
    : undefined;
}
