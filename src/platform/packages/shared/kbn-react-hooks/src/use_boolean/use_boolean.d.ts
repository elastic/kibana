import useToggle from 'react-use/lib/useToggle';
export type VoidHandler = () => void;
export interface UseBooleanHandlers {
    on: VoidHandler;
    off: VoidHandler;
    toggle: ReturnType<typeof useToggle>[1];
}
export type UseBooleanResult = [boolean, UseBooleanHandlers];
export declare const useBoolean: (initialValue?: boolean) => UseBooleanResult;
