import React from "react";

import {
    EuiButton,
    EuiCheckboxGroup,
    EuiFieldText,
    EuiForm,
    EuiFormRow,
    EuiTextArea,
    EuiSpacer,
    EuiButton,
    EuiSwitch,
    EuiPanel,
    EuiCode,
    EuiCodeBlock,
} from '@elastic/eui';
import FileCode from './FileCode';
import "./code.css"

interface State {
    path: string
    content: string,
    html?: string
}

export default class Code extends React.Component<any, State> {
    constructor(props: any) {
        super(props);
        this.state = {
            path: "HelloWorld.java",
            content: ` 
             comments  */
             import System.out;
             class HelloWorld {
                public static void main(String[] args){
                    // some comments 
                    int x = 5;
                    System.out.println("hello world");
                }
             } 
            `,
        }
    }

    highlight() {
        const {httpClient} = this.props;
        httpClient.post(`../api/castro/highlight/${this.state.path}`, {content: this.state.content}).then(response => {
            this.setState({html: response.data})
        })
    }


    render() {
        return (
            <div>
                <EuiForm>
                    <EuiFormRow
                        label="Text field"
                        helpText="Your file name."
                    >
                        <EuiFieldText name="first" placeholder={"HelloWorld.java"}
                                      value={this.state.path}
                                      onChange={(e) => this.setState({path: e.target.value})}
                        />
                    </EuiFormRow>
                    <EuiFormRow
                        label="Source"
                        fullWidth
                        helpText="Put your source content here"
                    >
                        <EuiTextArea
                            fullWidth
                            placeholder="class HelloWorld {}"
                            value={this.state.content}
                            onChange={(e) => this.setState({content: e.target.value})}
                        />
                    </EuiFormRow>
                    <EuiButton type="submit" size="s" fill onClick={() => this.highlight()}>
                        Highlight
                    </EuiButton>
                </EuiForm>
                <EuiSpacer size="xl"/>
                <EuiPanel paddingSize="l" hasShadow>
                    {this.state.html &&
                    <FileCode html={this.state.html} file={this.state.path}/>
                    }
                </EuiPanel>
                <EuiPanel paddingSize="l" hasShadow>
                    <EuiCodeBlock language="java">
                        {this.state.content}
                    </EuiCodeBlock>
                </EuiPanel>
            </div>
        )
    }
}