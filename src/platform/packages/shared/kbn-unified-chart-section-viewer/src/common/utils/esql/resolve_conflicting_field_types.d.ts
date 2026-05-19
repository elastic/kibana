import { ES_FIELD_TYPES } from '@kbn/field-types';
/**
 * Resolves conflicting field types to a single compatible type for casting.
 * When multiple field types are present (e.g., from different backing indices),
 * selects the widest compatible numeric type based on a precedence order.
 *
 * Precedence rules:
 * - double > float / half_float / scaled_float
 * - long > integer / short / byte
 * - double > long (mixed numeric types)
 * - counter_double combines with any float/double family member as double
 * - counter_long combines with any integer/long family member as long
 * - counter_* combined with a non-matching numeric family widens to double
 *
 * Histogram-class types (histogram, exponential_histogram, tdigest) are intentionally
 * not resolved here: ES|QL has no safe cast between them and the caller passes the
 * field through uncast so the resulting ES verification_exception surfaces to Lens.
 *
 * @param fieldTypes - Array of field types (may contain duplicates or compatible types)
 * @returns The selected field type, or undefined if types are incompatible or non-numeric
 */
export declare function resolveConflictingFieldTypes(fieldTypes: ES_FIELD_TYPES[]): ES_FIELD_TYPES | undefined;
