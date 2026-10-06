import type { ScopedHistory } from '@kbn/core/public';
import type { MouseEvent } from 'react';
import type { History } from 'history';
interface LocationObject {
    pathname?: string;
    search?: string;
    hash?: string;
}
export declare const toLocationObject: (to: string | LocationObject) => LocationObject;
export declare const reactRouterNavigate: (history: ScopedHistory | History, to: string | LocationObject, onClickCallback?: Function) => {
    href: string;
    onClick: (event: MouseEvent) => void;
};
export declare const reactRouterOnClickHandler: (history: ScopedHistory | History, to: string | LocationObject, onClickCallback?: Function) => (event: MouseEvent) => void;
export {};
