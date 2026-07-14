type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';
export declare class Sha256 {
    private _a;
    private _b;
    private _c;
    private _d;
    private _e;
    private _f;
    private _g;
    private _h;
    private _block;
    private _finalSize;
    private _blockSize;
    private _len;
    private _s;
    private _w;
    constructor();
    update(data: string | Buffer, encoding?: BufferEncoding): Sha256;
    digest(encoding: BufferEncoding): string;
    _update(M: Buffer): void;
    _hash(): Buffer<ArrayBuffer>;
}
export {};
