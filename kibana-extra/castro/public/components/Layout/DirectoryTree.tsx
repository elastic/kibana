import React from 'react';
import { EuiSideNav, EuiIcon } from '@elastic/eui';

import directoryTree from './mockData/directoreTree';

function to (node) {
    const data = {
        id: node.name,
        name: node.name,
        isSelected: true,
        onClick: () => {
            //link to file path
            console.log(node.path)
        }
    }
    if(!node.is_simple && node.obj_type === 2) {
        data.icon = <EuiIcon type="arrowRight"/>
    }
    if (node.children && node.children.length > 0) {
        data.items = node.children.map(to);
    }
    return data
}

export default class DirectoryTree extends React.PureComponent {
    public render() {
        const items= directoryTree.children.map(to);
        console.log(items, directoryTree)
        return <EuiSideNav
            items={items}
            style={{ width: 192 }}
        />
    }
}