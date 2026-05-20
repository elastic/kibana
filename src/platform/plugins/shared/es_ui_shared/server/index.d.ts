export { handleEsError, parseEsError } from './errors';
/** dummy plugin*/
export declare function plugin(): Promise<{
    setup(): void;
    start(): void;
}>;
