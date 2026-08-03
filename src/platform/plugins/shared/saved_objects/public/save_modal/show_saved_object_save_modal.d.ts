import type { FC, PropsWithChildren } from 'react';
import React from 'react';
/**
 * Represents the result of trying to persist the saved object.
 * Contains `error` prop if something unexpected happened (e.g. network error).
 * Contains an `id` if persisting was successful. If `id` and
 * `error` are undefined, persisting was not successful, but the
 * modal can still recover (e.g. the name of the saved object was already taken).
 */
export type SaveResult = {
    id?: string;
} | {
    error: Error;
};
/**
 * Minimum props expected for model components passed to `showSaveModal`
 */
export interface ShowSaveModalMinimalSaveModalProps {
    onSave: (...args: any[]) => Promise<SaveResult>;
    onClose: () => void;
}
/**
 * @deprecated legacy modal display mechanism
 */
export declare function showSaveModal(saveModal: React.ReactElement<ShowSaveModalMinimalSaveModalProps>, Wrapper?: FC<PropsWithChildren<unknown>>): void;
