import {ResponseMessage, ResponseErrorLiteral, ResponseError} from "vscode-jsonrpc/lib/messages";
import {DocumentSymbolParams, SymbolInformation, TextDocumentPositionParams, Hover} from "vscode-languageserver";

export interface LspClient {
    sendRequest(method: string, params: any): Promise<ResponseMessage>
}


export class LspRestClient implements LspClient {
    private _baseUri: string;
    private _customHeaders: { [header: string]: string };

    constructor(baseUri: string, customHeaders: { [header: string]: string } = {}) {
        this._baseUri = baseUri;
        this._customHeaders = customHeaders;
    }

    async sendRequest(method: string, params: any): Promise<ResponseMessage> {
        const headers = new Headers(this._customHeaders);
        headers.append("Content-Type", "application/json");
        const response = await fetch(`${this._baseUri}/${method}`, {
            method: "POST",
            headers,
            body: JSON.stringify(params)
        });
        if (response.ok) {
            return await response.json() as ResponseMessage;
        } else {
            const error = await response.json() as ResponseErrorLiteral<any>;
            throw new ResponseError<any>(error.code, error.message, error.data);
        }
    }
}

export class LspMethod<INPUT, OUTPUT> {
    private client: LspClient;
    private method: string;

    constructor(method: string, client: LspClient) {
        this.client = client;
        this.method = method;
    }

    async send(input: INPUT): Promise<OUTPUT> {
        return await this.client.sendRequest(this.method, input).then(result => result.result as OUTPUT)
    }
}

export class TextDocumentMethods {
    private readonly _client: LspClient;
    public documentSymbol: LspMethod<DocumentSymbolParams, SymbolInformation[]>;
    public hover: LspMethod<TextDocumentPositionParams, Hover>;

    constructor(client: LspClient) {
        this._client = client;
        this.documentSymbol = new LspMethod("textDocument/documentSymbol", this._client);
        this.hover = new LspMethod("textDocument/hover", this._client)
    }

}