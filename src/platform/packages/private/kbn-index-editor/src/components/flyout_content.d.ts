import type { FC } from 'react';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
export interface FlyoutContentProps {
    deps: FlyoutDeps;
    props: EditLookupIndexContentContext & {
        onClose: () => void;
    };
}
export declare const FlyoutContent: FC<FlyoutContentProps>;
