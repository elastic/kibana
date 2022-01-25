import React, { useState } from "react";
import { storiesOf } from "@storybook/react";
import { action } from "@storybook/addon-actions";

import Input from "./index";

export const defaultInput = {
  value: "",
  placeholder: "Type your search",
  currentCount: 0,
  totalCount: 10
};

export const actions = {
  onChange: action("onChange"),
  onNext: action("onNext"),
  onPrevious: action("onPrevious"),
  onClear: action("onClear"),
  onRegex: action("onRegex"),
  onCaseSensitive: action("onCaseSensitive")
};

storiesOf("Search Input", module)
  .addDecorator(story => <div style={{ padding: 30 }}>{story()}</div>)
  .add("default", () => {
    const [value, setValue] = useState("");
    const onChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
      setValue(evt.target.value);
      actions.onChange(evt);
    };
    return (
      <Input {...defaultInput} {...actions} value={value} onChange={onChange} />
    );
  });
