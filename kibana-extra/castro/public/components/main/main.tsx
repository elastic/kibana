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
    EuiSpacer
} from "@elastic/eui";

import {ICommit, IEntry} from '../../../common/proto'

import Code from './code'

interface MainProps {
    title: String,
    httpClient: any
}

interface MainState {
    entries: IEntry[],
    commitInfo: Array<{title: string, description?: string | null }>
}

export class Main extends React.Component<MainProps, MainState> {
    constructor(props: MainProps) {
        super(props);
        this.state = {
            commitInfo: [],
            entries: []
        };
    }

    componentDidMount() {
        /*
           FOR EXAMPLE PURPOSES ONLY.  There are much better ways to
           manage state and update your UI than this.
        */
        const {httpClient} = this.props;
        httpClient.get("../api/castro/example").then((resp) => {
            const data: ICommit = resp.data;
            const commitInfo = [
                {
                    title: "Commit",
                    description: data.commit
                },
                {
                    title: "Date",
                    description: data.date
                },
                {
                    title: "Committer",
                    description: data.committer
                },
                {
                    title: "Message",
                    description: data.message
                }
            ];
            let entries = data.entries || [];

            this.setState({commitInfo, entries: entries});
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
                </EuiPageHeader>
                <EuiPageBody>
                    <EuiPageContent>
                        <EuiPageContentHeader>
                            <EuiTitle>
                                <h2>Current Commit</h2>
                            </EuiTitle>
                        </EuiPageContentHeader>
                        <EuiPageContentBody>
                            <EuiDescriptionList
                                type="column"
                                listItems={this.state.commitInfo}
                                style={{maxWidth: '800px'}}
                            />
                            <EuiSpacer size="xl"/>
                            <Code httpClient={this.props.httpClient}/>
                            <EuiSpacer size="xl"/>
                            <EuiTitle>
                                <h2>Changed files</h2>
                            </EuiTitle>
                            <EuiSpacer size="xs"/>
                            {
                                this.state.entries.map((entry, idx) =>
                                    <EuiAccordion
                                        id={"fid" + idx}
                                        key={"fid" + idx}
                                        buttonContent={entry.path}
                                    >
                                        {
                                            entry.html &&
                                            <EuiCode dangerouslySetInnerHTML={{ __html: entry.html }} />
                                        }
                                    </EuiAccordion>
                                )
                            }
                        </EuiPageContentBody>
                    </EuiPageContent>
                </EuiPageBody>
            </EuiPage>
        );
    }

};
