import type { LayoutConfigType } from '../layout';
/**
 * Configuration of a file appender
 * @public
 */
export interface FileAppenderConfig {
    type: 'file';
    layout: LayoutConfigType;
    fileName: string;
}
