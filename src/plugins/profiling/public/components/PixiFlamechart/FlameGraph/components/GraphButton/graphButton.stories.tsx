import { storiesOf } from "@storybook/react";
import { action } from "@storybook/addon-actions";

import GraphButton from "./index";

export const defaultGraphButton = {
  tabIndex: 1
};

export const actions = {
  onClick: action("onClick")
};

storiesOf("Graph Button", module)
  .addDecorator(story => <div style={{ padding: 30 }}>{story()}</div>)
  .add("with left icon", () => {
    return <GraphButton {...defaultGraphButton} {...actions} icon="previous" />;
  })
  .add("with reenter icon", () => {
    return <GraphButton {...defaultGraphButton} {...actions} icon="recenter" />;
  })
  .add("with right icon", () => {
    return <GraphButton {...defaultGraphButton} {...actions} icon="next" />;
  })
  .add("disabled", () => (
    <GraphButton
      {...defaultGraphButton}
      {...actions}
      icon="recenter"
      disabled
    />
  ));
