import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import type { ICommandContext } from '../../registry/types';
export declare function getColumnExists(node: ESQLColumn | ESQLIdentifier, { columns }: Pick<ICommandContext, 'columns'>, excludeFields?: boolean): boolean;
export declare function columnIsPresent(node: ESQLColumn | ESQLIdentifier, columns: Set<string>): boolean;
export declare function getColumnName(node: ESQLColumn | ESQLIdentifier): string;
