import type { Context } from 'react';
export declare const createUseContext: <T>(Ctx: Context<T>, name: string) => () => NonNullable<T>;
