import React, {DOMElement} from "react";
import ReactDOM from 'react-dom';
import * as hljs from 'highlight.js'
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
    private currentEl: Element;
    private parent: Element;

    constructor(props: Props, context: any) {
        super(props, context);
        let lspClient = new LspRestClient("../api/lsp", {"kbn-xsrf": "1"});
        this.lspMethods = new TextDocumentMethods(lspClient);
        this.mouseOver = this.mouseOver.bind(this);
        this.addTooltip = this.addTooltip.bind(this);
    }

    mouseOver(e: Event) {
        const target = e.target as Element;
        this.currentEl = target;
        const tooltip = target.getAttribute("aria-describedby");
        if (tooltip) {
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
            html: true,
            container: this.parent,
            offset: 25,
            title: () => {
                let {language, value} = hover.contents[0];
                value = hljs.highlight(language, value).value;
                let result = `<div class="euiPanel euiPanel--paddingSmall">
<span class="euiCodeBlock euiCodeBlock--fontSmall euiCodeBlock--paddingLarge euiCodeBlock--inline">
    <code class="euiCodeBlock__code">${value}</code>
  </span>`;
                if (hover.contents.length > 0) {
                    result += `
                        <div class="euiHorizontalRule euiHorizontalRule--full euiHorizontalRule--marginXSmall"></div>
                        <div class="euiText">
                        <h5>${hover.contents[1].replace(/\*\*/g, "")}</h5>
                        </div>`
                }

                return result + `</div>`

            }
        });
        if (this.currentEl === target) {
            tooltip.show();
        }
    }


    componentDidMount(): void {
        this.parent = ReactDOM.findDOMNode(this) as Element;
        this.parent.querySelectorAll(".code-line span").forEach(el => {
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