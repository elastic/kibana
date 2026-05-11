/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Appender,
  LogRecord,
  LoggerFactory,
  LogMeta,
  Logger,
  LogMessageSource,
  LogLevelId,
  MetaFilterConfig,
} from '@kbn/logging';
import { LogLevel } from '@kbn/logging';

/**
 * @internal
 */
export type CreateLogRecordFn = <Meta extends LogMeta>(
  level: LogLevel,
  errorOrMessage: string | Error,
  meta?: Meta
) => LogRecord;

/**
 * Returns the most permissive (highest `value`) log level that should act as
 * the early guard for a logger with the given nominal level and meta filters.
 *
 * When no filters are present the gate level equals the nominal level.
 * When filters are present the gate level is the minimum level (most verbose)
 * across the nominal level and all filter levels, so that records eligible for
 * any filter can pass the early check before meta is inspected.
 */
const computeGateLevel = (nominalLevel: LogLevel, filters: ReadonlyArray<MetaFilterConfig>) =>
  filters.reduce((gateLevel, filter) => {
    const filterLevel = LogLevel.fromId(filter.level);
    return filterLevel.value > gateLevel.value ? filterLevel : gateLevel;
  }, nominalLevel);

/**
 * Determines the effective minimum log level for a specific log record by
 * evaluating its meta against all configured filters.
 *
 * Returns the most permissive level among all matching filters (or the nominal
 * level if no filter matches).
 */
const resolveEffectiveLevel = (
  nominalLevel: LogLevel,
  filters: ReadonlyArray<MetaFilterConfig>,
  meta: LogMeta | undefined
): LogLevel => {
  if (filters.length === 0) return nominalLevel;

  return filters.reduce((effectiveLevel, filter) => {
    if (!matchesMeta(meta, filter.match)) return effectiveLevel;
    const filterLevel = LogLevel.fromId(filter.level);
    return filterLevel.value > effectiveLevel.value ? filterLevel : effectiveLevel;
  }, nominalLevel);
};

/**
 * Returns the value at the given dot-notation `path` inside `obj`, or
 * `undefined` if any segment is missing or not an object.
 *
 * Supports simple property paths (e.g. `'labels.ruleType'`, `'event.dataset'`)
 * but not array indices or complex expressions.
 */
const getNestedValue = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

/**
 * Returns `true` when every key-value pair in `match` is found with strict
 * equality inside `meta`, using dot-notation paths to traverse nested fields
 * (e.g. `'labels.ruleType'`).
 */
const matchesMeta = (
  meta: LogMeta | undefined,
  match: Record<string, string | number | boolean>
): boolean => {
  if (meta == null) return false;
  return Object.entries(match).every(([path, value]) => getNestedValue(meta, path) === value);
};

/**
 * A basic, abstract logger implementation that delegates the create of log records to the child's createLogRecord function.
 * @internal
 */
export abstract class AbstractLogger implements Logger {
  /**
   * The most permissive log level across the nominal level and all filter levels.
   * Used as the O(1) early guard before meta is inspected.
   */
  private readonly gateLevel: LogLevel;

  constructor(
    protected readonly context: string,
    protected readonly level: LogLevel,
    protected readonly appenders: Appender[],
    protected readonly factory: LoggerFactory,
    private readonly filters: ReadonlyArray<MetaFilterConfig> = []
  ) {
    this.gateLevel = computeGateLevel(level, filters);
  }

  protected abstract createLogRecord<Meta extends LogMeta>(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: Meta
  ): LogRecord;

  public trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void {
    if (!this.gateLevel.supports(LogLevel.Trace)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, meta).supports(LogLevel.Trace)) return;
    if (typeof message === 'function') message = message();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Trace, message, meta));
  }

  public debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void {
    if (!this.gateLevel.supports(LogLevel.Debug)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, meta).supports(LogLevel.Debug)) return;
    if (typeof message === 'function') message = message();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Debug, message, meta));
  }

  public info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void {
    if (!this.gateLevel.supports(LogLevel.Info)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, meta).supports(LogLevel.Info)) return;
    if (typeof message === 'function') message = message();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Info, message, meta));
  }

  public warn<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void {
    if (!this.gateLevel.supports(LogLevel.Warn)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, meta).supports(LogLevel.Warn)) return;
    if (typeof errorOrMessage === 'function') errorOrMessage = errorOrMessage();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Warn, errorOrMessage, meta));
  }

  public error<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void {
    if (!this.gateLevel.supports(LogLevel.Error)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, meta).supports(LogLevel.Error)) return;
    if (typeof errorOrMessage === 'function') errorOrMessage = errorOrMessage();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Error, errorOrMessage, meta));
  }

  public fatal<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void {
    if (!this.gateLevel.supports(LogLevel.Fatal)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, meta).supports(LogLevel.Fatal)) return;
    if (typeof errorOrMessage === 'function') errorOrMessage = errorOrMessage();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Fatal, errorOrMessage, meta));
  }

  public isLevelEnabled(levelId: LogLevelId): boolean {
    return this.level.supports(LogLevel.fromId(levelId));
  }

  public log(record: LogRecord) {
    if (!this.gateLevel.supports(record.level)) return;
    if (!resolveEffectiveLevel(this.level, this.filters, record.meta).supports(record.level))
      return;
    this.appendRecord(record);
  }

  public get(...childContextPaths: string[]): Logger {
    return this.factory.get(...[this.context, ...childContextPaths]);
  }

  private appendRecord(record: LogRecord) {
    for (const appender of this.appenders) {
      appender.append(record);
    }
  }
}
