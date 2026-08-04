import type { EuiContextMenuPanelDescriptor, EuiThemeComputed } from '@elastic/eui';
import type { ActionGroups } from './types';
export declare function buildPanels(actions: ActionGroups, closePopover: () => void, euiTheme: EuiThemeComputed, dataTestSubjPrefix: string): EuiContextMenuPanelDescriptor[];
