import type { FC } from 'react';
import type { XDomain } from '../x_domain';
interface Props {
    value: unknown;
    formatter: (value: unknown) => string;
    xDomain?: XDomain;
}
export declare const TooltipHeader: FC<Props>;
export {};
