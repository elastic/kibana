import React from 'react';
import {EuiSideNav, EuiIcon} from '@elastic/eui';



interface Props {
    items : Array<any>
    onClick: Function
}
export default class DirectoryTree extends React.Component<Props, any> {


    to = (node) => {
        const data = {
            id: node.name,
            name: node.name,
            isSelected: true,
            onClick: () => {
                if(this.props.onClick) {
                    this.props.onClick(node)
                }
            }
        };
        if (node.children && node.children.length > 0) {
            data.icon = <EuiIcon type="arrowRight"/>;
            data.items = node.children.map(this.to);
        }
        return data
    };

    public render() {
        const items = this.props.items.map(this.to);
        return <EuiSideNav
            items={items}
            style={{width: 192}}
        />
    }
}