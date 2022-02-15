import { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const RecenterIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      width={width}
      height={height}
      className={className}
    >
      <path
        d="M11.64 4.41H4.36V11.69H11.64V4.41Z"
        stroke="black"
        strokeLinejoin="round"
      />
      <path d="M2.01 4.41V2.06H4.36" stroke="black" strokeLinejoin="round" />
      <path d="M11.64 2.06H13.99V4.41" stroke="black" strokeLinejoin="round" />
      <path
        d="M13.99 11.69V14.04H11.64"
        stroke="black"
        strokeLinejoin="round"
      />
      <path d="M4.36 14.04H2.01V11.69" stroke="black" strokeLinejoin="round" />
    </svg>
  );
};

export default RecenterIcon;
