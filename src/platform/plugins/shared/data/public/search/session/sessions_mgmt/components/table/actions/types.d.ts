import type extendSessionIcon from './icons/extend_session.svg';
export type OnActionComplete = () => void;
export type OnActionDismiss = () => void;
export interface IClickActionDescriptor {
    label: React.ReactNode;
    iconType: 'trash' | 'cancel' | typeof extendSessionIcon;
    onClick: () => Promise<void> | void;
}
