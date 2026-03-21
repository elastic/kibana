import type { FC, PropsWithChildren } from 'react';
export interface ButtonSubmitProps {
    disabled?: boolean;
    onClick: () => void;
}
export declare const ButtonSubmit: FC<PropsWithChildren<ButtonSubmitProps>>;
