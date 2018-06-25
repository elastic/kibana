import {ResponseMessage, ResponseErrorLiteral, ResponseError} from "vscode-jsonrpc/lib/messages";
import {DocumentSymbolParams, SymbolInformation} from "vscode-languageserver";
import {LanguageServerProxy} from "lsp-proxy";

export interface LspClient {
    sendRequest(method: string, params: any): Promise<ResponseMessage>
}

export class LspProxyClient {
    private proxy: LanguageServerProxy;
    constructor(proxy: LanguageServerProxy) {
        this.proxy = proxy;
    }

    sendRequest(method: string, params: any): Promise<ResponseMessage> {
        return this.proxy.receiveRequest(method, params) as Promise<ResponseMessage>
    }
}

export class LspRestClient implements LspClient{
    private _baseUri: string;
    private _customHeaders: { [header: string]: string };

    constructor(baseUri: string, customHeaders: { [header: string]: string } = {}) {
        this._baseUri = baseUri;
        this._customHeaders = customHeaders;
    }

    async sendRequest(method: string, params: any): Promise<ResponseMessage> {
        const headers = new Headers(this._customHeaders);

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

export class LspMethod<INPUT,OUTPUT> {
    private client: LspClient;
    private method: string;

    constructor(method: string,client: LspClient) {
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

    constructor(client: LspClient) {
        this._client = client;
        this.documentSymbol = new LspMethod<DocumentSymbolParams, SymbolInformation[]>("textDocument/documentSymbol", this._client)
    }

}