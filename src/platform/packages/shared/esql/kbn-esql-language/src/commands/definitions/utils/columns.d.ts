import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import type { ICommandContext, ESQLColumnData } from '../../registry/types';
import type { Commands } from '../keywords';
import type { ElasticsearchCommandOutputDefinition, ElasticsearchCommandOutputVariant } from '../types';
export declare function getColumnExists(node: ESQLColumn | ESQLIdentifier, { columns }: Pick<ICommandContext, 'columns'>, excludeFields?: boolean): boolean;
export declare function columnIsPresent(node: ESQLColumn | ESQLIdentifier, columns: Set<string>): boolean;
export declare function getColumnName(node: ESQLColumn | ESQLIdentifier): string;
/**
 * Escapes a field name into a valid ES|QL column reference, backtick-quoting the segments
 * that need it (digits, keywords, symbols). Existing ES|QL column quoting is preserved.
 *
 * Set `asExpression` when suggesting a column whose name may be a whole expression (e.g. an
 * implicit EVAL output like `host.cpu.pct > 0.5`): those are quoted as a single identifier,
 * valid column paths still escape per segment.
 */
export declare const escapeEsqlColumnName: (columnName: string, { asExpression }?: {
    asExpression?: boolean;
}) => string;
/** Reads the generated output schema for a command from the command definitions. */
export declare const getCommandOutput: (command: Commands) => ElasticsearchCommandOutputDefinition | undefined;
/** Reads the generated output columns for a command variant (defaults to the single `all` variant). */
export declare const getCommandOutputColumns: (command: Commands, variant?: string) => ElasticsearchCommandOutputVariant | undefined;
/** Builds columns by prefixing each generated output column with the target field name. */
export declare const buildPrefixedColumns: (prefix: string, columns: ElasticsearchCommandOutputVariant) => ESQLColumnData[];
