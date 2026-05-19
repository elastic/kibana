import type { DefaultItemAction } from '@elastic/eui';
export declare function getExpandAction<T extends object>({ name, description, isExpanded, onClick, ...props }: {
    name: string;
    description: string;
    isExpanded: (value: T) => boolean;
    onClick: (valute: T | undefined) => void;
    'data-test-subj': string;
}): DefaultItemAction<T>;
