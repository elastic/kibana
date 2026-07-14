import type { FC } from 'react';
import type { ThemeName } from '@kbn/core-ui-settings-common';
import { type DarkModeValue } from '@kbn/core-ui-settings-common';
interface Props {
    darkMode: DarkModeValue;
    themeName: ThemeName;
    stylesheetPaths: string[];
}
export declare const Styles: FC<Props>;
export {};
