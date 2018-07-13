import React from 'react';

import {
    EuiHeader,
    EuiHeaderBreadcrumbs,
    EuiHeaderSection,
    EuiHeaderSectionItem,
    EuiHeaderSectionItemButton,
    EuiHeaderLogo,
    EuiIcon,
    EuiSideNav,
    EuiPage,
    EuiFlexGroup,
    EuiFlexItem
} from '@elastic/eui';

import DirectoryTree from './DirectoryTree';
import CodeBlock from './CodeBlock';
import FileCode from '../main/FileCode';
import Editor from './Editor';
interface State {
    children: Array<any>
    node: any,
    workspace? : string
}

export default class Layout extends React.Component<any, State> {


    constructor(props) {
        super(props);
        this.state = {
            children: [],
            node: null,
            workspace: ''
        }
    }

    componentDidMount() {
        fetch("../api/castro/tree").then(resp => resp.json()).then((json: any) => {
            this.setState({
                workspace: json.workspace,
                children: json.root.children});
        });
    }

    onClick = (node) => {
        this.setState({node})
    };

    public render() {
        return <EuiPage>
            <EuiHeader>
                <EuiHeaderSection>
                    <EuiHeaderSectionItem border="right">
                        <EuiHeaderLogo>Code Browsing</EuiHeaderLogo>
                    </EuiHeaderSectionItem>

                </EuiHeaderSection>

                <EuiHeaderSection side="right">
                    <EuiHeaderSectionItemButton aria-label="Search">
                        <EuiIcon
                            type="search"
                            size="m"
                        />
                    </EuiHeaderSectionItemButton>
                </EuiHeaderSection>
            </EuiHeader>
            <EuiFlexGroup>
                <EuiFlexItem style={{maxWidth: 300}}>
                    <DirectoryTree items={this.state.children} onClick={this.onClick}/>
                </EuiFlexItem>

                <EuiFlexItem>
                    { this.state.node &&
                        <Editor file={this.state.workspace +'/'+ this.state.node.path} blob={this.state.node.blob}/>
                    }
                </EuiFlexItem>
            </EuiFlexGroup>
        </EuiPage>
    }
}