import React, {DOMElement} from "react";
import ReactDOM from 'react-dom';

import {
    EuiCode,
    EuiGlobalToastList
} from '@elastic/eui';
import {LspRestClient, TextDocumentMethods} from "../../../common/LspClient";

// @ts-ignore
import monaco from 'init-monaco';

interface Props {
    file: string,
    blob: string
}

interface State {

}

export default class Editor extends React.Component<Props, State> {
    private lspMethods: TextDocumentMethods;
    private container: Element;
    private editor: any;


    constructor(props: Props, context: any) {
        super(props, context);
        let lspClient = new LspRestClient("../api/lsp", {"kbn-xsrf": "1"});
        this.lspMethods = new TextDocumentMethods(lspClient);
    }

    componentDidMount(): void {
        this.container = ReactDOM.findDOMNode(this) as Element;
        const r = window['require'];
        r.config({paths: {'vs': '../monaco/vs'}});

        monaco.initMonaco(monaco => {

            monaco.languages.registerHoverProvider('typescript', {
                provideHover: (model, position) => this.onHover(monaco, model, position)
            });

            this.editor = monaco.editor.create(this.container, {
                value: this.props.blob,
                language: "typescript",
                readOnly: true,
            });

        })
    }

    onHover(monaco: monaco, model, position: monaco.Position) {
        return this.lspMethods.hover.send({
            position: {
                line: position.lineNumber - 1,
                character: position.column - 1
            },
            textDocument: {
                uri: `file://${this.props.file}`
            }
        }).then(hover => {
            if (hover.contents.length > 0) {
                const {range, contents} = hover;

                return {
                    range: new monaco.Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1),
                    contents: (contents as Array<any>).reverse().map((e => {
                        return { value: e.value || e.toString() };
                    }))
                }
            } else {
                return null
            }

        }, err => {

        });
    }

    render() {
        return <div style={{height: 600}}>

        </div>;
    }

}