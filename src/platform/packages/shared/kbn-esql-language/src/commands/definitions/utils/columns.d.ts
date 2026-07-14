import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import type { ICommandContext, ESQLColumnData } from '../../registry/types';
import type { Commands } from '../keywords';
import type { ElasticsearchCommandOutputDefinition, ElasticsearchCommandOutputVariant } from '../types';
export declare function getColumnExists(node: ESQLColumn | ESQLIdentifier, { columns }: Pick<ICommandContext, 'columns'>, excludeFields?: boolean): boolean;
export declare function columnIsPresent(node: ESQLColumn | ESQLIdentifier, columns: Set<string>): boolean;
export declare function getColumnName(node: ESQLColumn | ESQLIdentifier): string;
/** Reads the generated output schema for a command from the command definitions. */
export declare const getCommandOutput: (command: Commands) => ElasticsearchCommandOutputDefinition | undefined;
/** Reads the generated output columns for a command variant (defaults to the single `all` variant). */
export declare const getCommandOutputColumns: (command: Commands, variant?: string) => ElasticsearchCommandOutputVariant | undefined;
/** Builds columns by prefixing each generated output column with the target field name. */
export declare const buildPrefixedColumns: (prefix: string, columns: ElasticsearchCommandOutputVariant) => ESQLColumnData[];
