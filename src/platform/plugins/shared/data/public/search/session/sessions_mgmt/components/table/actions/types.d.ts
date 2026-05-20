import type { IconType } from '@elastic/eui';
export type OnActionComplete = () => void;
export type OnActionDismiss = () => void;
export interface IClickActionDescriptor {
    label: React.ReactNode;
    iconType: IconType;
    onClick: () => Promise<void> | void;
}
