import type { EuiTableFieldDataColumnType } from '@elastic/eui';
export type ColumnLayoutProps = Pick<EuiTableFieldDataColumnType<object>, 'width' | 'minWidth' | 'maxWidth' | 'truncateText'>;
export declare const getColumnLayoutProps: ({ width, minWidth, maxWidth, truncateText, }: ColumnLayoutProps) => ColumnLayoutProps;
/**
 * Resolve a layout attribute, distinguishing "key omitted" from "key
 * explicitly set to `undefined`".
 *
 * - Key not present in `attributes` → returns `fallback` (the preset default
 *   fires).
 * - Key present (even if its value is `undefined`) → returns `attributes[key]`
 *   verbatim, so the default does NOT fire. Combined with
 *   {@link getColumnLayoutProps} dropping `undefined` values from its output,
 *   this lets consumers "clear" a default by writing
 *   `<Column.UpdatedAt maxWidth={undefined} />` — no `max-width` style is
 *   emitted at all and the column behaves as if no cap had ever been set.
 *
 * Use over `attributes[key] ?? fallback` whenever a baked-in default exists
 * that consumers may need to opt out of. The `??` form treats explicit
 * `undefined` as "missing" and so silently re-applies the default, which is
 * surprising for callers who think they cleared it.
 */
export declare const pickAttribute: <K extends keyof ColumnLayoutProps>(attributes: ColumnLayoutProps, key: K, fallback: ColumnLayoutProps[K]) => ColumnLayoutProps[K];
