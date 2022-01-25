import React, { useState } from "react";
import { storiesOf } from "@storybook/react";
import { action } from "@storybook/addon-actions";

import Switch from "./index";
import ChartIcon from "../../icons/ChartIcon";
import PercentageIcon from "../../icons/PercentageIcon";

export const defaultSwitch = {
  options: [
    { label: "Stack traces", icon: <ChartIcon width={16} height={16} /> },
    { label: "Percentage", icon: <PercentageIcon width={16} height={16} /> }
  ],
  activeIdx: 0
};

export const actions = {
  onChange: action("onChange")
};

storiesOf("Switch", module)
  .addDecorator(story => <div style={{ padding: 30 }}>{story()}</div>)
  .add("default", () => {
    const [active, setActive] = useState(0);
    return (
      <Switch
        {...defaultSwitch}
        activeIdx={active}
        onChange={(idx: number) => {
          setActive(idx);
          actions.onChange(idx);
        }}
      />
    );
  })
  .add("disabled", () => <Switch {...defaultSwitch} {...actions} disabled />);
