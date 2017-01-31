import React from 'react';
import ContainerDimensions from 'react-container-dimensions';
import calculateTileSize from './tile_size';
import FontResize from 'plugins/rework/components/font_resize/font_resize';

export class GridBlocks extends React.Component {
  render() {
    const {children, autoFontSize} = this.props;

    return (
      <ContainerDimensions>
        { ({ width, height }) => {
          const tileSize = calculateTileSize(width, height, children.length);
          const newKidsOnTheBlock = React.Children.map(children, (child, i) => {
            const style = {height: `${tileSize}px`, width: `${tileSize}px`, display: 'inline-block'};
            return (<div style={style}>{child}</div>);
          });
          return (<div>{newKidsOnTheBlock}</div>);
        }}
      </ContainerDimensions>
    );
  }
}

export default GridBlocks;
