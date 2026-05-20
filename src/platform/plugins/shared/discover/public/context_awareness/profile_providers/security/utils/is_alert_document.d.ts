import type { DataTableRecord } from '@kbn/discover-utils';
/**
 * Returns true if the document is not an alert or an attack (event.kind is defined and is not 'signal').
 * Returns false when event.kind is absent, e.g. documents from complex ESQL queries.
 */
export declare const isEventDocument: (record: DataTableRecord) => boolean;
/**
 * Returns true if the document is not an alert or an attack (event.kind is not 'signal')
 */
export declare const isAttackDocument: (record: DataTableRecord) => boolean;
/**
 * Returns true if the document is a security alert (not an event and not an attack)
 */
export declare const isAlertDocument: (record: DataTableRecord) => boolean;
/**
 * Returns true if the document is a threat intelligence indicator (IOC).
 * Detection is based on event.type containing 'indicator' (ECS classification).
 */
export declare const isIOCDocument: (record: DataTableRecord) => boolean;
