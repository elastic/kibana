import React from 'react';
import _ from 'lodash';
import { Palette } from 'plugins/rework/components/palette/palette';
import { Popover, PopoverContent, PopoverTitle } from 'reactstrap';
import uuid from 'uuid/v4';
import './palette_chooser.less';

export class PaletteChooser extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
    this.id = `paletteChooser-${uuid()}`;
    this.state = {popover: false};
  }

  togglePopover() {
    this.setState({popover: !this.state.popover});
  }

  choose(palette) {
    return () => this.props.onChange(palette);
  }

  render() {
    return (
      <div className="rework--palette-chooser">
        <div className="rework--palette-chooser-preview" onClick={this.togglePopover.bind(this)} id={this.id}>
          <Palette colors={this.props.value.seed}/>
        </div>
        <Popover
          placement='bottom left'
          isOpen={this.state.popover}
          target={this.id}
          toggle={this.togglePopover.bind(this)}>
          <PopoverContent>
            <div className="rework--palette-chooser-options">
              {_.map(this.props.options, palette => (
                <div
                  key={palette.seed.join(',')}
                  className="rework--palette-chooser-option"
                  onClick={this.choose(palette).bind(this)}>
                  <Palette colors={palette.seed}/>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
}
