import React, {DOMElement} from "react";
import ReactDOM from 'react-dom';

import {
    EuiCode,
    EuiGlobalToastList
} from '@elastic/eui';
import {LspRestClient, TextDocumentMethods} from "../../../common/LspClient";

interface Props {
    file: string,
    html: string
}

interface Toast {
    title: string,
    text: string
}

interface State {
    toasts: Toast[],
}

let toastId = 0;

export default class FileCode extends React.Component<Props, State> {

    private lspMethods: TextDocumentMethods;


    constructor(props: Props, context: any) {
        super(props, context);
        let lspClient = new LspRestClient("/lsp", {"kbn-xsrf": "1"})
        this.lspMethods = new TextDocumentMethods(lspClient);
        this.mouseOut = this.mouseOut.bind(this);
        this.mouseOver = this.mouseOver.bind(this);
        this.state = {
            toasts : []
        }
    }
    addToast = (toast) => {
        this.setState({
            toasts: this.state.toasts.concat(toast),
        });
    };

    mouseOver(e: Event) {
        const target = e.target as Element;
        let lineNum = target.getAttribute("data-line");
        let range = target.getAttribute("data-range");
        if (lineNum && range) {


            this.lspMethods.hover.send({
                position: {
                    line: parseInt(lineNum),
                    character: parseInt(range.split(",")[0])
                },
                textDocument: {
                    uri: `file://${this.props.file}`
                }
            }).then(hover => {
                    if(hover.contents.length >0) {
                        let content = hover.contents[0];
                        this.addToast({
                            id: toastId ++,
                            title: content.language,
                            text: content.value
                        })
                    }

            }, err => {

            });
        }
    }



    mouseOut(e: Event) {
        this.setState({
            toasts: []
        })
    }
    removeToast = (removedToast) => {
        this.setState(prevState => ({
            toasts: prevState.toasts.filter(toast => toast.id !== removedToast.id),
        }));
    };

    componentDidMount(): void {
        const el = ReactDOM.findDOMNode(this) as Element;
        el.querySelectorAll(".code-line span").forEach(el => {
            el.addEventListener('mouseover', this.mouseOver);
            el.addEventListener('mouseout', this.mouseOut);
        })

    }

    render() {
        return <div>
            <EuiCode dangerouslySetInnerHTML={{__html: this.props.html}}/>
            <EuiGlobalToastList
                toasts={this.state.toasts}
                dismissToast={this.removeToast}
                toastLifeTimeMs={6000}
            />
        </div>
    }
}