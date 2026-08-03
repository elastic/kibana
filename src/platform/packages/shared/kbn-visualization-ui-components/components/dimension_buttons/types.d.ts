import type { IconType } from '@elastic/eui';
export interface AccessorConfig {
    columnId: string;
    triggerIconType?: 'color' | 'disabled' | 'colorBy' | 'none' | 'invisible' | 'aggregate' | 'custom';
    customIcon?: IconType;
    color?: string;
    palette?: string[] | Array<{
        color: string;
        stop: number;
    }>;
}
export interface Message {
    severity: 'warning' | 'error' | 'info';
    content: React.ReactNode;
}
