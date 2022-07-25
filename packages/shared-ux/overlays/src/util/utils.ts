import { COLOR_MODES_STANDARD, EuiThemeColorModeStandard } from "@elastic/eui";
import { CoreTheme } from "./to_mount_point";

export const getColorMode = (theme: CoreTheme): EuiThemeColorModeStandard => {
    return theme.darkMode ? COLOR_MODES_STANDARD.dark : COLOR_MODES_STANDARD.light;
  };
  