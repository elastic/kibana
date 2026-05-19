import type { UseEuiTheme } from '@elastic/eui';
import type { monaco } from '../..';
export declare function createTheme({ euiTheme }: UseEuiTheme, backgroundColor?: string): monaco.editor.IStandaloneThemeData;
export declare const buildTheme: typeof createTheme;
export declare const buildTransparentTheme: (euiTheme: UseEuiTheme) => monaco.editor.IStandaloneThemeData;
