import  events from 'events';
import {AbstractMessageReader, DataCallback, MessageReader} from 'vscode-jsonrpc/lib/messageReader'
import {AbstractMessageWriter, MessageWriter} from 'vscode-jsonrpc/lib/messageWriter'
import {Message, RequestMessage, ResponseMessage} from 'vscode-jsonrpc/lib/messages';
import {createConnection, IConnection} from "vscode-languageserver";
import * as net from "net";
import {
    createMessageConnection,
    MessageConnection,
    SocketMessageReader,
    SocketMessageWriter,
    Logger
} from 'vscode-jsonrpc';
import {InitializedNotification, InitializeResult, ClientCapabilities, WorkspaceFolder} from "vscode-languageserver-protocol";

class HttpRequestEmitter extends events.EventEmitter {
}


export class LanguageServerProxy {
    private conn: IConnection;
    private _clientConnection: MessageConnection | null = null;

    private sequenceNumber = 0;
    private httpEmitter = new HttpRequestEmitter();
    private replies = new Map<number, [Function, Function]>();
    private readonly _targetHost?: string;
    private readonly _targetPort: number;
    private readonly logger?: Logger;
    public initialized: boolean = false;

    constructor(targetPort: number, targetHost?: string, logger?: Logger) {
        this._targetHost = targetHost;
        this._targetPort = targetPort;
        this.logger = logger;
        this.conn = createConnection(new HttpMessageReader(this.httpEmitter), new HttpMessageWriter(this.replies, logger));
    }

    receiveRequest(method: string, params: any) {
        let message: RequestMessage = {
            jsonrpc: "2.0",
            id: this.sequenceNumber++,
            method: method,
            params: params
        };
        return new Promise((resolve, reject) => {
            this.logger && this.logger.log(`emit message ${JSON.stringify(message)}`);
            this.replies.set(message.id as number, [resolve, reject]);
            this.httpEmitter.emit('message', message);
        })
    }

    connect(): Promise<MessageConnection> {
        if (this._clientConnection) {
            return Promise.resolve(this._clientConnection);
        }
        return new Promise(resolve => {
            const socket = net.connect(this._targetPort, this._targetHost);
            socket.on('connect', () => {
                const reader = new SocketMessageReader(socket);
                const writer = new SocketMessageWriter(socket);
                this._clientConnection = createMessageConnection(reader, writer, this.logger);
                this._clientConnection.listen();
                socket.on('end', () => {
                    if (this._clientConnection) {
                        this._clientConnection.dispose();
                    }
                    this._clientConnection = null
                });
                resolve(this._clientConnection);
            });
        });
    }

    async initialize(clientCapabilities: ClientCapabilities, workspaceFolders: [WorkspaceFolder]): Promise<InitializeResult> {
        const clientConn = await this.connect();
        const rootUri = workspaceFolders[0].uri;
        const params = {
            processId: null,
            workspaceFolders,
            rootUri,
            capabilities: clientCapabilities
        };

        return await clientConn.sendRequest("initialize", params).then(r => {
            clientConn.sendNotification(InitializedNotification.type,{});
            this.initialized = true;
            return r as InitializeResult
        });
    }

    listen() {
        this.conn.onRequest((method: string, ...params) => {
            this.logger && this.logger.log("received rest request method: " + method);
            return this.connect().then(clientConn => {
                this.logger && this.logger.log(`proxy method:${method} to client `);
                return clientConn.sendRequest(method, ...params)
            });
        });
        this.conn.listen();
    }
}

class HttpMessageReader extends AbstractMessageReader implements MessageReader {
    private httpEmitter: HttpRequestEmitter;

    public constructor(httpEmitter: HttpRequestEmitter) {
        super();
        httpEmitter.on('error', (error: any) => this.fireError(error));
        httpEmitter.on('close', () => this.fireClose());
        this.httpEmitter = httpEmitter;
    }

    public listen(callback: DataCallback): void {
        this.httpEmitter.on('message', callback);
    }
}

class HttpMessageWriter extends AbstractMessageWriter implements MessageWriter {
    private replies: Map<number, [Function, Function]>;
    private logger: Logger | undefined;

    constructor(replies: Map<number, [Function, Function]>, logger: Logger | undefined) {
        super();
        this.replies = replies;
        this.logger = logger;
    }

    write(msg: Message): void {
        let response = (msg as ResponseMessage);
        if (response.id != null) { // this is a response
            let id = response.id as number;
            const reply = this.replies.get(id);
            if (reply) {
                this.replies.delete(id);
                const [resolve, reject] = reply;
                if (response.error) {
                    reject(response.error)
                } else {
                    resolve(response)
                }
            } else {
                this.logger && this.logger.error("missing reply functions for " + id);
            }
        } else {
            this.logger && this.logger.log(`ignored message ${JSON.stringify(msg) } because of no id`)
        }
    }
}