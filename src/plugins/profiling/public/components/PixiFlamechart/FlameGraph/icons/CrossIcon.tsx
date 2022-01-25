import { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const CrossIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.4 5.6l-4.8 4.8M5.6 5.6l4.8 4.8"
      />
    </svg>
  );
};

export default CrossIcon;
