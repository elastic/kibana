import React from "react";
import {
    EuiPage,
    EuiPageHeader,
    EuiTitle,
    EuiPageBody,
    EuiPageContent,
    EuiPageContentHeader,
    EuiPageContentBody,
    EuiText,
    EuiDescriptionList,
    EuiAccordion,
    EuiCodeBlock,
    EuiCode,
    EuiSpacer,
    EuiButton
} from "@elastic/eui";

import { Link } from 'react-router-dom';

import Code from './code';
import Counter from '../counter';
import { Entry } from '../../../server/routes/example';

interface MainProps {
    title: String,
    httpClient: any
}

interface MainState {
    workspace: string,
    entries: Entry[],
}

export class Main extends React.Component<MainProps, MainState> {
    constructor(props: MainProps) {
        super(props);
        this.state = {
            workspace: "",
            entries: []
        };
    }

    componentDidMount() {
        /*
           FOR EXAMPLE PURPOSES ONLY.  There are much better ways to
           manage state and update your UI than this.
        */
        const {httpClient} = this.props;
        httpClient.get("../api/castro/example").then((resp: any) => {
            this.setState({...resp.data});
        });
    }

    render() {
        const {title} = this.props;
        return (
            <EuiPage>
                <EuiPageHeader>
                    <EuiTitle size="l">
                        <h1>Hello {title}!</h1>
                    </EuiTitle>
                  <EuiButton><Link to="/codebrowsing">browsing code</Link></EuiButton>
                </EuiPageHeader>
                <EuiPageBody>
                    <EuiPageContent>
                        <EuiPageContentHeader>
                            <EuiTitle>
                                <h2>{this.state.workspace}</h2>
                            </EuiTitle>
                        </EuiPageContentHeader>
                        <EuiPageContentBody>
                            <Counter />
                            <EuiSpacer size="xl"/>
                            <Code httpClient={this.props.httpClient}/>
                            <EuiSpacer size="xl"/>
                            <EuiTitle>
                                <h2>Files</h2>
                            </EuiTitle>
                            <EuiSpacer size="xs"/>
                        </EuiPageContentBody>
                    </EuiPageContent>
                </EuiPageBody>
            </EuiPage>
        );
    }

};
