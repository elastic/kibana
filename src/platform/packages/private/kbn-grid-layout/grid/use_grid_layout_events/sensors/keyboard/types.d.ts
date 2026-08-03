export declare enum KeyboardCode {
    Space = "Space",
    Down = "ArrowDown",
    Right = "ArrowRight",
    Left = "ArrowLeft",
    Up = "ArrowUp",
    Esc = "Escape",
    Enter = "Enter",
    Tab = "Tab"
}
export interface KeyboardCodes {
    start: Array<KeyboardEvent['code']>;
    cancel: Array<KeyboardEvent['code']>;
    end: Array<KeyboardEvent['code']>;
    move: Array<KeyboardEvent['code']>;
}
export type UserKeyboardEvent = KeyboardEvent | React.KeyboardEvent<HTMLButtonElement>;
