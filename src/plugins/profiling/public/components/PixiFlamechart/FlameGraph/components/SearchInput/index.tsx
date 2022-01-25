import React, { FC, useState, useRef, ChangeEvent } from "react";

import UpIcon from "../../icons/UpIcon";
import DownIcon from "../../icons/DownIcon";
import CrossIcon from "../../icons/CrossIcon";

import css from "./searchInput.module.scss";

interface Props {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNext: Function;
  onPrevious: Function;
  onClear: Function;
  onRegex: Function;
  onCaseSensitive: Function;
  currentCount: number;
  totalCount: number;
  isRegexActive?: boolean;
  isCaseSensitiveActive?: boolean;
  placeholder?: string;
  className?: string;
}

const Input: FC<Props> = ({
  value,
  currentCount,
  totalCount,
  placeholder,
  className,
  onChange,
  onPrevious,
  onNext,
  onClear,
  onRegex,
  isRegexActive,
  onCaseSensitive,
  isCaseSensitiveActive
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const iconSize = 16;

  const isNextDisabled = value === "" || currentCount >= totalCount;

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isNextDisabled === false && event.key === "Enter") {
      onNext();
    }
  };

  return (
    <div className={`${css.host} ${className}`}>
      <div
        className={`
          ${css.inputWrapper}
          ${focused ? css.focused : ""}
        `}
      >
        <input
          ref={inputRef}
          type="string"
          placeholder={placeholder}
          className={css.input}
          value={value}
          onChange={evt => {
            onChange(evt);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
          onKeyDown={onKeyDown}
        />

        <div className={css.counterContainer}>
          <div className={`${css.counter} ${value === "" && css.hidden}`}>
            {currentCount}/{totalCount}
          </div>

          <div className={css.counterSeparator}></div>

          <button
            className={`${css.regexButton} ${
              isRegexActive ? css.regexButtonEnabled : ""
            }`}
            onClick={() => onRegex()}
            data-tooltip={`Regex search Status: ${
              isRegexActive ? "Enabled" : "Disabled"
            }`}
          >
            .*
          </button>

          <button
            className={`${css.caseSensitiveButton} ${
              isCaseSensitiveActive ? css.caseSensitiveButtonEnabled : ""
            }`}
            onClick={() => onCaseSensitive()}
            data-tooltip={`Case-sensitive search Status: ${
              isCaseSensitiveActive ? "Enabled" : "Disabled"
            }`}
          >
            Aa
          </button>

          <button
            className={css.actionButton}
            disabled={isNextDisabled}
            onClick={() => onNext()}
          >
            <DownIcon
              width={iconSize}
              height={iconSize}
              className={css.icon}
            ></DownIcon>
          </button>

          <button
            className={css.actionButton}
            disabled={value === "" || currentCount <= 1}
            onClick={() => onPrevious()}
          >
            <UpIcon
              width={iconSize}
              height={iconSize}
              className={css.icon}
            ></UpIcon>
          </button>

          <button
            className={css.actionButton}
            disabled={value === ""}
            onClick={() => onClear()}
          >
            <CrossIcon
              width={iconSize}
              height={iconSize}
              className={css.icon}
            ></CrossIcon>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Input;
