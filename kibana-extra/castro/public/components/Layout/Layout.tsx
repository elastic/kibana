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
    EuiFlexGroup,
    EuiFlexItem
} from '@elastic/eui';

import DirectoryTree from './DirectoryTree';
import CodeBlock from './CodeBlock';

export default class Layout extends React.Component {
    public render() {
        return <div><EuiHeader>
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
                <EuiFlexItem style={{ maxWidth: 300 }}>
                    <DirectoryTree />
                </EuiFlexItem>

                <EuiFlexItem>
                    <CodeBlock />
                </EuiFlexItem>
            </EuiFlexGroup>
        </div>
    }
}