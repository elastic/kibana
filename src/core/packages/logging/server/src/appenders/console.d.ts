import type { LayoutConfigType } from '../layout';
/**
 * Configuration of a console appender
 * @public
 */
export interface ConsoleAppenderConfig {
    type: 'console';
    layout: LayoutConfigType;
}
