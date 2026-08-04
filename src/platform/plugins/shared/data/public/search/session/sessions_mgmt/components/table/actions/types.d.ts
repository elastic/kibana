import type { EuiContextMenuItemIcon } from '@elastic/eui';
export type OnActionComplete = () => void;
export type OnActionDismiss = () => void;
export interface IClickActionDescriptor {
    label: React.ReactNode;
    icon: EuiContextMenuItemIcon;
    onClick: () => Promise<void> | void;
}
