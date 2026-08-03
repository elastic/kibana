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

interface CompiledMatchPredicate {
  readonly pathSegments: readonly string[];
  readonly flatKey: string;
  readonly value: string | number | boolean;
}

interface CompiledMetaFilter {
  readonly level: LogLevel;
  readonly predicates: readonly CompiledMatchPredicate[];
}

const compileMetaFilters = (filters: ReadonlyArray<MetaFilterConfig>): CompiledMetaFilter[] =>
  filters.map((filter) => ({
    level: LogLevel.fromId(filter.level),
    predicates: Object.entries(filter.match).map(([path, value]) => ({
      pathSegments: path.split('.'),
      flatKey: path,
      value,
    })),
  }));

/**
 * Returns the most permissive (highest `value`) log level that should act as
 * the early guard for a logger with the given nominal level and meta filters.
 *
 * When no filters are present the gate level equals the nominal level.
 * When filters are present the gate level is the most verbose level across
 * the nominal level and all filter levels, so records eligible for any filter
 * can pass the early check before meta is inspected.
 *
 * The gate cheaply skips levels more verbose than any configured filter level.
 * It does not avoid per-record filter evaluation for levels at or below the gate.
 */
const computeGateLevel = (
  nominalLevel: LogLevel,
  compiledFilters: ReadonlyArray<CompiledMetaFilter>
) =>
  compiledFilters.reduce((gateLevel, filter) => {
    return filter.level.value > gateLevel.value ? filter.level : gateLevel;
  }, nominalLevel);

const getNestedValueFromSegments = (obj: unknown, segments: readonly string[]): unknown =>
  segments.reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

const getMetaValue = (meta: LogMeta, predicate: CompiledMatchPredicate): unknown => {
  const metaRecord = meta as Record<string, unknown>;

  if (predicate.pathSegments.length === 1) {
    return metaRecord[predicate.pathSegments[0]!];
  }

  const rootKey = predicate.pathSegments[0]!;
  const rootValue = metaRecord[rootKey];
  const flatValue = metaRecord[predicate.flatKey];
  if (rootValue === undefined && flatValue === undefined) {
    return undefined;
  }

  const nestedValue = getNestedValueFromSegments(meta, predicate.pathSegments);
  if (nestedValue !== undefined) {
    return nestedValue;
  }

  return flatValue;
};

const matchesCompiledMeta = (
  meta: LogMeta | undefined,
  predicates: readonly CompiledMatchPredicate[]
): boolean => {
  if (meta == null) {
    return false;
  }

  return predicates.every((predicate) => getMetaValue(meta, predicate) === predicate.value);
};

/**
 * Determines the effective minimum log level for a specific log record by
 * evaluating its meta against all configured filters.
 *
 * Returns the most permissive level among all matching filters (or the nominal
 * level if no filter matches).
 */
const resolveEffectiveLevel = (
  nominalLevel: LogLevel,
  compiledFilters: ReadonlyArray<CompiledMetaFilter>,
  meta: LogMeta | undefined
): LogLevel => {
  if (compiledFilters.length === 0) {
    return nominalLevel;
  }

  return compiledFilters.reduce((effectiveLevel, filter) => {
    if (!matchesCompiledMeta(meta, filter.predicates)) {
      return effectiveLevel;
    }

    return filter.level.value > effectiveLevel.value ? filter.level : effectiveLevel;
  }, nominalLevel);
};

/**
 * A basic, abstract logger implementation that delegates the create of log records to the child's createLogRecord function.
 * @internal
 */
export abstract class AbstractLogger implements Logger {
  /**
   * The most permissive log level across the nominal level and all filter levels.
   * Used as an early guard before meta is inspected.
   */
  private readonly gateLevel: LogLevel;
  private readonly compiledFilters: ReadonlyArray<CompiledMetaFilter>;

  constructor(
    protected readonly context: string,
    protected readonly level: LogLevel,
    protected readonly appenders: Appender[],
    protected readonly factory: LoggerFactory,
    filters: ReadonlyArray<MetaFilterConfig> = []
  ) {
    this.compiledFilters = compileMetaFilters(filters);
    this.gateLevel = computeGateLevel(level, this.compiledFilters);
  }

  protected abstract createLogRecord<Meta extends LogMeta>(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: Meta
  ): LogRecord;

  /**
   * Filters only loosen the nominal level for more-verbose records. When the
   * requested level is at or below the nominal level, meta can be ignored.
   */
  private resolveEffectiveLevelForRecord(
    requestedLevel: LogLevel,
    meta: LogMeta | undefined
  ): LogLevel {
    if (this.compiledFilters.length === 0 || requestedLevel.value <= this.level.value) {
      return this.level;
    }

    if (meta == null) {
      return this.level;
    }

    return resolveEffectiveLevel(this.level, this.compiledFilters, meta);
  }

  private shouldLogRecord(requestedLevel: LogLevel, meta: LogMeta | undefined): boolean {
    if (!this.gateLevel.supports(requestedLevel)) {
      return false;
    }

    return this.resolveEffectiveLevelForRecord(requestedLevel, meta).supports(requestedLevel);
  }

  public trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void {
    if (!this.shouldLogRecord(LogLevel.Trace, meta)) return;
    if (typeof message === 'function') message = message();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Trace, message, meta));
  }

  public debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void {
    if (!this.shouldLogRecord(LogLevel.Debug, meta)) return;
    if (typeof message === 'function') message = message();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Debug, message, meta));
  }

  public info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void {
    if (!this.shouldLogRecord(LogLevel.Info, meta)) return;
    if (typeof message === 'function') message = message();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Info, message, meta));
  }

  public warn<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void {
    if (!this.shouldLogRecord(LogLevel.Warn, meta)) return;
    if (typeof errorOrMessage === 'function') errorOrMessage = errorOrMessage();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Warn, errorOrMessage, meta));
  }

  public error<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void {
    if (!this.shouldLogRecord(LogLevel.Error, meta)) return;
    if (typeof errorOrMessage === 'function') errorOrMessage = errorOrMessage();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Error, errorOrMessage, meta));
  }

  public fatal<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void {
    if (!this.shouldLogRecord(LogLevel.Fatal, meta)) return;
    if (typeof errorOrMessage === 'function') errorOrMessage = errorOrMessage();
    this.appendRecord(this.createLogRecord<Meta>(LogLevel.Fatal, errorOrMessage, meta));
  }

  public isLevelEnabled(levelId: LogLevelId): boolean {
    return this.level.supports(LogLevel.fromId(levelId));
  }

  public log(record: LogRecord) {
    if (!this.shouldLogRecord(record.level, record.meta)) return;
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
