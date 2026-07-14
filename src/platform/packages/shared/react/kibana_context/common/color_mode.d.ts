import type { EuiThemeColorModeStandard } from '@elastic/eui';
import type { KibanaTheme } from './types';
/**
 * Given a `KibanaTheme`, provide a color mode for use with EUI.
 * @param theme KibanaTheme
 * @returns EuiThemeColorModeStandard
 */
export declare const getColorMode: (theme: KibanaTheme) => EuiThemeColorModeStandard;
