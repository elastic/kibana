import React, { FC } from "react";

import css from "./switch.module.scss";

interface Option {
  label: string;
  icon?: React.ReactNode;
}

interface Props {
  options: Array<Option>;
  activeIdx: number;
  onChange: Function;
  disabled?: boolean;
  pixiSwitch?: boolean;
  dataTooltip?: string;
}

const Switch: FC<Props> = ({
  options,
  activeIdx,
  onChange,
  disabled,
  pixiSwitch,
  dataTooltip
}) => (
  <div
    className={`${css.host} ${pixiSwitch ? css.pixiSwitch : ""}`}
    data-tooltip={dataTooltip}
  >
    {options.map((option: Option, idx: number) => (
      <button
        type="button"
        className={`
            ${css.option}
            ${activeIdx === idx && !disabled ? css.active : ""}
            ${disabled ? css.disabled : ""}
          `}
        key={option.label}
        onClick={() => activeIdx !== idx && onChange(idx)}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);

export default Switch;
