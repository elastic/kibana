import type { IHttpInterceptController } from '@kbn/core-http-browser';
/** @internal */
export declare class HttpInterceptController implements IHttpInterceptController {
    private _halted;
    get halted(): boolean;
    halt(): void;
}
