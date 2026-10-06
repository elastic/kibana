/**
 * Configuration of a logging layout.
 * See {@link JsonLayoutConfigType} and {@link PatternLayoutConfigType}
 * @public
 */
export type LayoutConfigType = PatternLayoutConfigType | JsonLayoutConfigType;
/**
 * Configuration of a json layout
 * @public
 */
export interface JsonLayoutConfigType {
    type: 'json';
}
/**
 * Configuration of a pattern layout
 * @public
 */
export interface PatternLayoutConfigType {
    type: 'pattern';
    highlight?: boolean;
    pattern?: string;
}
