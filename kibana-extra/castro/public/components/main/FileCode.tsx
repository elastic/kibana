import React, {DOMElement} from "react";
import ReactDOM from 'react-dom';

import {
    EuiCode,
    EuiGlobalToastList
} from '@elastic/eui';
import {LspRestClient, TextDocumentMethods} from "../../../common/LspClient";
import {Hover} from "vscode-languageserver";
import Tooltip from 'tooltip.js';

interface Props {
    file: string,
    html: string
}

interface Toast {
    title: string,
    text: string
}

interface State {

}

export default class FileCode extends React.Component<Props, State> {

    private lspMethods: TextDocumentMethods;
    private currentEl : Element
    private currentTooltip : Tooltip

    constructor(props: Props, context: any) {
        super(props, context);
        let lspClient = new LspRestClient("/lsp", {"kbn-xsrf": "1"})
        this.lspMethods = new TextDocumentMethods(lspClient);
        this.mouseOver = this.mouseOver.bind(this);
        this.addTooltip = this.addTooltip.bind(this);
    }

    mouseOver(e: Event) {
        const target = e.target as Element;
        this.currentEl = target;
        const tooltip = target.getAttribute("aria-describedby");
        if(tooltip) {
            return;
        }
        const lineEl = target.closest('.code-line');
        const lineNum = lineEl.getAttribute("data-line");
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
                if (hover.contents.length > 0) {
                    this.addTooltip(target, hover);
                }

            }, err => {

            });
        }
    }

    addTooltip(target: Element, hover: Hover) {
        const tooltip = new Tooltip(target, {
            delay: 100,
            html: false,
            title: () => {
                return hover.contents[0].value;
            }
        });
        if(this.currentEl === target) {
            tooltip.show();
        }
    }


    componentDidMount(): void {
        const el = ReactDOM.findDOMNode(this) as Element;
        el.querySelectorAll(".code-line span").forEach(el => {
            el.addEventListener('mouseover', this.mouseOver);
            el.addEventListener('mouseout', (event) => {
                this.currentEl = null
            });
        })
    }

    render() {
        return <div>
            <EuiCode dangerouslySetInnerHTML={{__html: this.props.html}}/>

        </div>
    }

}