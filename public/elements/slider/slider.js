import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';
import icon from './icon.svg';
import _ from 'lodash';
import uuid from 'uuid/v4';
import { Range, Handle } from 'rc-slider';
import Tooltip from 'rc-tooltip';
import 'rc-slider/assets/index.css';


const handle = (props) => {
  const { value, dragging, index, ...restProps } = props;
  return (
    <Tooltip
      overlay={value}
      visible={dragging}
      placement="top"
      key={index}
    >
      <Handle {...restProps} />
    </Tooltip>
  );
};

elements.push(new Element('slider', {
  displayName: 'Range Slider',
  icon: icon,
  args: [
    new Arg('column', {
      type: 'string',
      default: 'price',
      help: `The field on which to filter. Different sources may handle this in different ways.
              Most sources will ignore fields they do not know about.`,
      expand: true,
    }),
    new Arg('min', {
      type: 'number',
      default: -10000000000,
      expand: true,
      help: 'The lowest value permitted',
    }),
    new Arg('max', {
      type: 'number',
      default: 10000000000,
      expand: true,
      help: 'The largest value permitted',
    }),
  ],
  template: class SliderElement extends React.PureComponent {
    constructor(props) {
      super(props);
      const filterValue = _.get(props.filter, 'value');
      this.state = filterValue || {gte: props.args.min, lte: props.args.max};
    }

    set(value) {
      this.setState({gte: value[0], lte: value[1]});
      this.props.setFilter({
        type: 'range',
        value: {
          column: this.props.args.column,
          gte: value[0],
          lte: value[1]
        }
      });
    }

    onChange(value) {
      this.setState({gte: value[0], lte: value[1]});
    };

    componentWillMount() {
      if (!this.props.filter) {
        this.set([this.state.gte, this.state.lte]);
      }
    }

    render() {
      const {args, setArg, setFilter, filter} = this.props;

      return (
        <div className="rework--range-element">
          <Range
            count={2}
            handle={handle}
            min={args.min}
            max={args.max}
            onChange={this.onChange.bind(this)}
            onAfterChange={this.set.bind(this)}
            value={[this.state.gte, this.state.lte]}
          />
        </div>
      );
    }

  }
}));
